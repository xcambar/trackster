import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnvironment } from "../environment";

type SupabaseError = {
  code: string;
  hint: null | string;
  details: null | string;
  message: string;
};
type SupabaseResponse = {
  error: null | SupabaseError;
  //data: null | T[];
  count: null | number;
  status: number;
  statusText: string;
};

type PullPayload<T = object> = {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: T;
};

type SupabasePushResponse = SupabaseResponse & {
  data: null | number[];
};

type SupabasePullResponse<T = object> = SupabaseResponse & {
  data: null | PullPayload<T>[];
};

type SupaBaseQueueOptions = {
  queue: string;
  schema?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  client?: SupabaseClient;
};

export class SupabaseQueue {
  client: SupabaseClient;

  schema: string;
  queue: string;

  constructor({
    schema = "pgmq_public",
    queue,
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    client,
  }: SupaBaseQueueOptions) {
    this.schema ??= schema;
    this.queue = queue;
    if (!this.queue) {
      throw new Error("The name of the queue is mandatory");
    }

    if (client) {
      this.client = client;
    } else {
      if (supabaseUrl && supabaseAnonKey) {
        this.client = createClient(supabaseUrl, supabaseAnonKey);
      } else {
        this.client = createClient(
          getEnvironment("SUPABASE_URL"),
          getEnvironment("SUPABASE_ANON_KEY")
        );
      }
    }
  }

  public async push(
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: Record<string, any>,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: Record<string, any>
  ): Promise<SupabasePushResponse> {
    return this.client.schema(this.schema).rpc("send", {
      queue_name: this.queue,
      ...options,
      message,
    });
  }

  public async pull<T>(): Promise<SupabasePullResponse<T>> {
    return this.client.schema(this.schema).rpc("pop", {
      queue_name: this.queue,
    });
  }
}
