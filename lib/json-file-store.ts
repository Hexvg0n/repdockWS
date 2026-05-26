import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const fileLocks = new Map<string, Promise<unknown>>();

async function withFileLock<Result>(filePath: string, task: () => Promise<Result>) {
  const previousTask = fileLocks.get(filePath) ?? Promise.resolve();
  const currentTask = previousTask.catch(() => undefined).then(task);
  const trackedTask = currentTask.finally(() => {
    if (fileLocks.get(filePath) === trackedTask) {
      fileLocks.delete(filePath);
    }
  });

  fileLocks.set(filePath, trackedTask);

  return currentTask;
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFileAtomic(filePath: string, value: unknown) {
  const directory = path.dirname(filePath);
  const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

export async function mutateJsonFile<T, Result>(
  filePath: string,
  fallback: T,
  mutate: (current: T) => Promise<{ next: T; result: Result }> | { next: T; result: Result },
) {
  return withFileLock(filePath, async () => {
    const current = await readJsonFile(filePath, fallback);
    const { next, result } = await mutate(current);
    await writeJsonFileAtomic(filePath, next);
    return result;
  });
}
