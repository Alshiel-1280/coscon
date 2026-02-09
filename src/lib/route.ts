export async function readParams<T>(params: T | Promise<T>): Promise<T> {
  return Promise.resolve(params);
}
