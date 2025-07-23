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
  data: null | [];
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

type SupabasePushResponse =
  | SupabaseResponse
  | {
      data: null | number[];
    };

type SupabasePullResponse<T = object> =
  | SupabaseResponse
  | {
      data: null | PullPayload<T>[];
    };

type SupaBaseQueueOptions = {
  queue: string;
  schema?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  client?: SupabaseClient;
};

type RPCClient = {
  rpc(method: string, opts: object): Promise<SupabaseResponse>;
};

export class SupabaseQueue {
  private _client: RPCClient;

  private schema: string;
  private queue: string;

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

    let candidateClient;
    if (client) {
      candidateClient = client;
    } else {
      if (supabaseUrl && supabaseAnonKey) {
        candidateClient = createClient(supabaseUrl, supabaseAnonKey);
      } else {
        candidateClient = createClient(
          getEnvironment("SUPABASE_URL"),
          getEnvironment("SUPABASE_ANON_KEY")
        );
      }
    }
    this._client = candidateClient.schema(this.schema) as unknown as RPCClient;
  }

  /**
   * This is meant to be primarily useful in tests
   * as a way to expose the underlying structure and mock properly.
   *
   * It could be removed but at the cost of more complex ergonomics.
   */
  public get _schema() {
    return this._client;
  }

  public async push(
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: Record<string, any>,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: Record<string, any>
  ): Promise<SupabasePushResponse> {
    return this._schema.rpc("send", {
      queue_name: this.queue,
      ...options,
      message,
    });
  }

  public async pull<T>(): Promise<SupabasePullResponse<T>> {
    return this._schema.rpc("pop", {
      queue_name: this.queue,
    });
  }
}
