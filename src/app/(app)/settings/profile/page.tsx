
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  // email: z.string().email().optional(), // Email change is more complex, defer for now
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, userDetails, loading, role } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: userDetails?.displayName || user?.displayName || '',
    },
  });

  // Update form default values when userDetails load
  useState(() => {
    if (userDetails) {
      reset({ displayName: userDetails.displayName || user?.displayName || '' });
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !db) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado ou DB não disponível." });
      return;
    }
    setIsSubmitting(true);
    try {
      // Update Firebase Auth profile
      if (auth.currentUser) { // Ensure currentUser is available
        await updateProfile(auth.currentUser, { displayName: data.displayName });
      }

      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: data.displayName,
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Perfil Atualizado", description: "Seu nome de exibição foi atualizado." });
      // Optionally refetch userDetails in AuthContext or update local state
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: "Erro ao atualizar perfil", description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return <p>Por favor, faça login para ver seu perfil.</p>;
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Visualize e atualize suas informações pessoais.
        </p>
      </div>
      <Card className="shadow-lg max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline">Informações Pessoais</CardTitle>
          <CardDescription>Atualize seu nome de exibição.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email || ''} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado por aqui.</p>
            </div>
            <div>
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input id="displayName" {...register('displayName')} />
              {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
            </div>
            <div>
              <Label htmlFor="role">Sua Função</Label>
              <Input id="role" value={role || 'Não definida'} disabled className="capitalize bg-muted/50" />
            </div>
            {role === 'dj' && userDetails?.dj_percentual && (
                 <div>
                    <Label htmlFor="dj_percentual">Seu Percentual de DJ</Label>
                    <Input id="dj_percentual" value={`${(userDetails.dj_percentual * 100).toFixed(0)}%`} disabled className="bg-muted/50" />
                </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
