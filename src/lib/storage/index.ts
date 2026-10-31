import { IStorageProvider } from "./types";
import { B2StorageProvider } from "./b2-provider";
import { LocalStorageProvider } from "./local-provider";
import { env } from "../env";

let storageProviderInstance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (storageProviderInstance) {
    return storageProviderInstance;
  }

  const isB2Configured = Boolean(
    env.B2_ENDPOINT &&
    env.B2_APPLICATION_KEY &&
    env.B2_BUCKET_NAME &&
    env.B2_KEY_ID
  );

  if (isB2Configured) {
    storageProviderInstance = new B2StorageProvider();
  } else {
    storageProviderInstance = new LocalStorageProvider();
  }

  return storageProviderInstance;
}

export * from "./types";
