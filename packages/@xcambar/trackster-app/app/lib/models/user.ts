import { CompleteSession } from "~/services/session.server";
import { supabase } from "~/services/supabase.server";

export const getUserFromSession = async (session: CompleteSession) => {
  const supabaseSession = session.supabaseSession;
  const response = await supabase.auth.getUser(supabaseSession?.access_token);
  if (response.error) {
    throw response.error;
  }
  return response.data.user;
};
