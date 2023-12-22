/**
 * Throws when timeout takes longer than promise
 * @param millis millis until timeout
 * @param promise promise to race against timeout
 * @returns <T> or throws
 */
export default function withTimeout<T>(
  millis: number,
  promise: Promise<T>
): Promise<T> {
  const timeout = new Promise((resolve, reject) =>
    setTimeout(() => reject(`Timed out after ${millis} ms.`), millis)
  );
  // return new Promise((res, rej) => rej());
  return Promise.race([promise, timeout]) as Promise<T>;
}
