import { createClient } from './server.ts';
import { cookies } from './server.ts';

export default async function Page() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from('todos').select();

  return {
    todos
  };
}
