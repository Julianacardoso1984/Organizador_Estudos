-- Script de Criação do Banco de Dados Supabase (Organizador de Estudos)
-- Copie este código e cole no 'SQL Editor' do painel do Supabase e clique em 'Run'.

-- 1. Criação das Tabelas
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '📚',
    color TEXT DEFAULT '#8B5CF6',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    blocks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'study',
    color TEXT DEFAULT '#8B5CF6',
    duration INT DEFAULT 60,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT,
    drive_url TEXT,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mind_maps (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'mind',
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY, -- Mantendo como UUID, embora o app antes usasse prefixo top_
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    studied BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    emoji TEXT DEFAULT '💻',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    questions JSONB DEFAULT '[]'::jsonb,
    score INT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.useful_links (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    emoji TEXT DEFAULT '🔗',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Preferências de Usuário Simples
CREATE TABLE IF NOT EXISTS public.preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    study_schedule JSONB DEFAULT '{"mon":[],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}'::jsonb,
    focus_time INT DEFAULT 25
);

-- 2. Habilitar Row Level Security (Segurança)
-- Isso garante que usuários só possam ver e editar seus próprios dados.
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de RLS
CREATE POLICY "Users can manage their own subjects" ON public.subjects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own pages" ON public.pages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own calendar_events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own materials" ON public.materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own mind_maps" ON public.mind_maps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own topics" ON public.topics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own courses" ON public.courses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own flashcards" ON public.flashcards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own useful_links" ON public.useful_links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own preferences" ON public.preferences FOR ALL USING (auth.uid() = user_id);

-- 4. Criar Storage Bucket para Arquivos
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', false) ON CONFLICT DO NOTHING;

-- Política de RLS para o Bucket "materials"
CREATE POLICY "Users can manage their own material files" ON storage.objects FOR ALL USING (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);
