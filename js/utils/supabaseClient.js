'use strict';

/**
 * supabaseClient.js — Inicialização do cliente Supabase.
 * IMPORTANTE: Substitua as strings abaixo pelas credenciais do seu projeto.
 */

// INSIRA SUAS CREDENCIAIS AQUI
const SUPABASE_URL = 'https://ggsfmbxofrnlosxiuubf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_secret_IveDsHm5St1b74-UzZBYpA_3DwFSFpv';

let supabase = null;

if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'COLOQUE_SUA_URL_AQUI') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('⚠️ Supabase não configurado. Por favor, insira a URL e a Anon Key em js/utils/supabaseClient.js');
}

window.SupabaseClient = supabase;
