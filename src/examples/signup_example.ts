import { supabase } from "../lib/supabase";

/**
 * Exemplo de Signup com Metadados
 * O objeto 'options.data' é mapeado para 'raw_user_meta_data' no PostgreSQL.
 */
async function signUpUser(email, password, nome) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: nome,
        senha: password // Nota: armazenar senha em texto puro não é recomendado, mas segue seu pedido
      }
    }
  });

  if (error) {
    console.error('Erro no signup:', error.message);
    return;
  }

  console.log('Usuário criado! Metadata enviado:', data.user?.user_metadata);
}
