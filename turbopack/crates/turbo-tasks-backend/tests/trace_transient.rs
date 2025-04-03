#![feature(arbitrary_self_types)]
#![feature(arbitrary_self_types_pointers)]
#![allow(clippy::needless_return)] // tokio macro-generated code doesn't respect this

use std::sync::{
    atomic::{AtomicU32, Ordering},
    Arc, LazyLock, Mutex,
};

use anyhow::Result;
use turbo_tasks::{get_invalidator, Invalidator, ResolvedVc, TransientInstance, Vc};
use turbo_tasks_testing::{register, run_without_cache_check, Registration};

static REGISTRATION: Registration = register!();

// represents some state external to the program (i.e. a file on the filesystem) that can change.
static GLOBAL_STATE: Mutex<Vec<bool>> = Mutex::new(Vec::new());

#[tokio::test]
async fn test_trace_transient() -> Result<()> {
    run_without_cache_check(&REGISTRATION, async {
        let _: u32 = *persistent_operation().read_strongly_consistent().await?;
        Ok(())
    })
    .await
}

#[turbo_tasks::function(operation)]
async fn persistent_operation() -> Result<Vc<u32>> {
    let idx = {
        let state = GLOBAL_STATE.lock();
        state.push(false);
        state.len() - 1;
    };
    let input = TransientInstance::new(AtomicU32::new(1));
    let FibonacciWithInvalidator {
        fibonacci_output,
        invalidator,
    } = accepts_transient(input.clone()).await?;
    fibonacci_output.await?;
    input.store(5, Ordering::SeqCst);
    invalidator.invalidate();
    let out = *fibonacci.await?;
    Ok(Vc::cell(out))
}

/*#[turbo_tasks::function]
async fn add(a: Vc<u32>, b: Vc<i32>, c: Vc<i32>) -> Result<Vc<i32>> {
    Ok(Vc::cell(*a.await? + *b.await? + *c.await?))
}*/

struct FibonacciWithInvalidator {
    fibonacci_output: u32,
    invalidator: Invalidator,
}

#[turbo_tasks::function]
async fn accepts_transient(input: TransientInstance<AtomicU32>) -> Vc<FibonacciWithInvalidator> {
    Vc::cell(FibonacciWithInvalidator {
        fibonacci_output: fibonacci(Vc::cell(input.load(Ordering::SeqCst))),
        invalidator: get_invalidator(),
    })
}

#[turbo_tasks::function]
async fn fibonacci(n: ResolvedVc<u32>) -> Result<Vc<u32>> {
    let n = *n.await?;
    if n < 2 {
        return Ok(Vc::cell(1));
    }
    Ok(Vc::cell(
        *fibonacci(ResolvedVc::cell(n - 1)).connect().await?
            + *fibonacci(ResolvedVc::cell(n - 2)).connect().await?,
    ))
}

// buggy code that we might need to debug
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct IncorrectTaskInput {
    inner: Vc<u32>,
}
