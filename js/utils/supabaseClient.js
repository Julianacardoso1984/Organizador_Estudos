'use strict';

/**
 * supabaseClient.js — Inicialização do cliente Supabase.
 * IMPORTANTE: Substitua as strings abaixo pelas credenciais do seu projeto.
 */

// INSIRA SUAS CREDENCIAIS AQUI
const SUPABASE_URL = 'https://ggsfmbxofrnlosxiuubf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RyyrVttnQEUXk6WLHLtOIQ_342poZMJ';

let supabase = null;

if (typeof window.supabase === 'undefined') {
  console.error('Erro Crítico: A biblioteca do Supabase não foi carregada. Verifique a tag <script> no index.html e sua conexão com a internet.');
  window._supabaseError = 'cdn_failed';
} else if (SUPABASE_URL === 'COLOQUE_SUA_URL_AQUI') {
  console.warn('⚠️ Supabase não configurado. Por favor, insira a URL e a Anon Key em js/utils/supabaseClient.js');
  window._supabaseError = 'missing_credentials';
} else {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window._supabaseError = null;
  } catch (err) {
    console.error('Erro ao inicializar o cliente do Supabase:', err);
    window._supabaseError = 'init_failed';
  }
}

window.SupabaseClient = supabase;
