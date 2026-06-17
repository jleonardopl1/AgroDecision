import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { useStaff } from '@/hooks/use-staff';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

// Tipos do RBAC entram em types.ts apos `npm run db:types` (migration 0008).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

interface StaffRow { id: string; nome: string; email: string; is_master: boolean; ativo: boolean }
interface GroupRow { id: string; chave: string; nome: string; descricao: string | null; group_permissions: { permission: string }[] }
interface Membership { staff_id: string; group_id: string }

async function loadEquipe() {
  const [staffRes, groupsRes, memRes] = await Promise.all([
    sb.from('staff_members').select('id, nome, email, is_master, ativo').order('nome'),
    sb.from('access_groups').select('id, chave, nome, descricao, group_permissions(permission)').order('nome'),
    sb.from('staff_group_members').select('staff_id, group_id'),
  ]);
  const err = staffRes.error || groupsRes.error || memRes.error;
  if (err) throw err;
  return {
    staff: (staffRes.data ?? []) as StaffRow[],
    groups: (groupsRes.data ?? []) as GroupRow[],
    memberships: (memRes.data ?? []) as Membership[],
  };
}

export default function Equipe() {
  const { isMaster } = useStaff();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['equipe'], queryFn: loadEquipe });
  const [novo, setNovo] = useState({ id: '', nome: '', email: '' });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['equipe'] });
  const fail = (msg: string) => (e: unknown) => toast.error(msg, { description: String((e as Error)?.message ?? e) });

  const toggleMembership = useMutation({
    mutationFn: async ({ staffId, groupId, isMember }: { staffId: string; groupId: string; isMember: boolean }) => {
      const q = isMember
        ? sb.from('staff_group_members').delete().eq('staff_id', staffId).eq('group_id', groupId)
        : sb.from('staff_group_members').insert({ staff_id: staffId, group_id: groupId });
      const { error: e } = await q;
      if (e) throw e;
    },
    onSuccess: invalidate,
    onError: fail('Nao foi possivel alterar o acesso'),
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error: e } = await sb.from('staff_members').update(patch).eq('id', id);
      if (e) throw e;
    },
    onSuccess: invalidate,
    onError: fail('Nao foi possivel salvar'),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!novo.id || !novo.nome || !novo.email) throw new Error('Preencha ID, nome e email.');
      const { error: e } = await sb.from('staff_members').insert({ id: novo.id.trim(), nome: novo.nome.trim(), email: novo.email.trim() });
      if (e) throw e;
    },
    onSuccess: () => { setNovo({ id: '', nome: '', email: '' }); toast.success('Membro adicionado'); invalidate(); },
    onError: fail('Nao foi possivel adicionar'),
  });

  if (isLoading) {
    return <div className='flex min-h-[40vh] items-center justify-center'><Loader2 className='h-8 w-8 animate-spin text-primary' /></div>;
  }

  if (error) {
    return (
      <Card className='border-destructive/30'>
        <CardHeader>
          <CardTitle>RBAC ainda nao aplicado</CardTitle>
          <CardDescription>Rode a migration <code>0008_rbac_staff.sql</code> no SQL Editor do Supabase para criar as tabelas de equipe e acessos.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const staff = data?.staff ?? [];
  const groups = data?.groups ?? [];
  const memberships = data?.memberships ?? [];
  const isMember = (staffId: string, groupId: string) => memberships.some((m) => m.staff_id === staffId && m.group_id === groupId);

  return (
    <div className='space-y-8'>
      <header className='space-y-1'>
        <h1 className='flex items-center gap-2 text-2xl font-bold'><ShieldCheck className='h-6 w-6 text-primary' /> Equipe AgroDecision</h1>
        <p className='text-sm text-muted-foreground'>Gerencie a equipe interna, grupos de acesso e permissoes. {isMaster ? 'Voce e Master.' : 'Somente leitura (apenas o Master gerencia).'}</p>
      </header>

      {isMaster ? (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'><UserPlus className='h-4 w-4' /> Adicionar membro</CardTitle>
            <CardDescription>O membro precisa ja ter conta. Informe o User ID (Supabase &rarr; Authentication &rarr; Users), nome e email. Um convite por email entra como melhoria.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end'>
            <div className='space-y-1'><Label htmlFor='m-id'>User ID</Label><Input id='m-id' value={novo.id} onChange={(e) => setNovo((p) => ({ ...p, id: e.target.value }))} placeholder='uuid' /></div>
            <div className='space-y-1'><Label htmlFor='m-nome'>Nome</Label><Input id='m-nome' value={novo.nome} onChange={(e) => setNovo((p) => ({ ...p, nome: e.target.value }))} placeholder='Maria Souza' /></div>
            <div className='space-y-1'><Label htmlFor='m-email'>Email</Label><Input id='m-email' type='email' value={novo.email} onChange={(e) => setNovo((p) => ({ ...p, email: e.target.value }))} placeholder='maria@agrodecision.com.br' /></div>
            <Button onClick={() => addMember.mutate()} disabled={addMember.isPending}>Adicionar</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className='space-y-3'>
        <h2 className='text-lg font-semibold'>Membros ({staff.length})</h2>
        {staff.length === 0 ? <p className='text-sm text-muted-foreground'>Nenhum membro ainda.</p> : null}
        <div className='grid gap-3'>
          {staff.map((s) => (
            <Card key={s.id}>
              <CardContent className='space-y-3 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <p className='font-semibold'>{s.nome} {s.is_master ? <Badge className='ml-1'>Master</Badge> : null}</p>
                    <p className='text-xs text-muted-foreground'>{s.email}</p>
                  </div>
                  {isMaster ? (
                    <div className='flex items-center gap-4'>
                      <label className='flex items-center gap-2 text-xs text-muted-foreground'>Ativo <Switch checked={s.ativo} onCheckedChange={(v) => updateStaff.mutate({ id: s.id, patch: { ativo: v } })} /></label>
                      <label className='flex items-center gap-2 text-xs text-muted-foreground'>Master <Switch checked={s.is_master} onCheckedChange={(v) => updateStaff.mutate({ id: s.id, patch: { is_master: v } })} /></label>
                    </div>
                  ) : null}
                </div>
                <Separator />
                <div className='flex flex-wrap gap-2'>
                  {groups.map((g) => {
                    const member = isMember(s.id, g.id);
                    return (
                      <button key={g.id} type='button' disabled={!isMaster || toggleMembership.isPending} onClick={() => toggleMembership.mutate({ staffId: s.id, groupId: g.id, isMember: member })} className='disabled:cursor-default'>
                        <Badge variant={member ? 'default' : 'outline'} className={isMaster ? 'cursor-pointer' : ''}>{g.nome}</Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className='space-y-3'>
        <h2 className='text-lg font-semibold'>Grupos &amp; permissoes</h2>
        <div className='grid gap-3 sm:grid-cols-2'>
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className='space-y-2 p-4'>
                <p className='font-semibold'>{g.nome}</p>
                {g.descricao ? <p className='text-xs text-muted-foreground'>{g.descricao}</p> : null}
                <div className='flex flex-wrap gap-1.5 pt-1'>
                  {(g.group_permissions ?? []).map((p) => (
                    <Badge key={p.permission} variant='secondary' className='font-mono text-[10px]'>{p.permission}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
