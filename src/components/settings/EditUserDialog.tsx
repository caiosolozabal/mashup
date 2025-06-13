
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDetails, UserRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const editUserFormSchema = z.object({
  displayName: z.string().min(1, 'Nome é obrigatório.'),
  role: z.enum(['admin', 'partner', 'dj', 'financeiro']), // Adjust as per your roles
  dj_percentual: z.preprocess(
    (val) => (String(val).trim() === '' ? null : parseFloat(String(val))),
    z.number().min(0).max(1).nullable().optional() // Percentage between 0 and 1
  ),
  bankName: z.string().optional().nullable(),
  bankAgency: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankAccountType: z.enum(['corrente', 'poupanca']).optional().nullable(),
  bankDocument: z.string().optional().nullable(),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserDialogProps {
  user: UserDetails;
  isOpen: boolean;
  onClose: (updated?: boolean) => void;
}

export default function EditUserDialog({ user, isOpen, onClose }: EditUserDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      displayName: user.displayName || '',
      role: user.role || 'dj', // Default to 'dj' if no role
      dj_percentual: user.dj_percentual ?? null,
      bankName: user.bankName || '',
      bankAgency: user.bankAgency || '',
      bankAccount: user.bankAccount || '',
      bankAccountType: user.bankAccountType || undefined,
      bankDocument: user.bankDocument || '',
    },
  });

  useEffect(() => {
    // Reset form when user prop changes (e.g., opening dialog for a different user)
    if (user) {
      reset({
        displayName: user.displayName || '',
        role: user.role || 'dj',
        dj_percentual: user.dj_percentual ?? null,
        bankName: user.bankName || '',
        bankAgency: user.bankAgency || '',
        bankAccount: user.bankAccount || '',
        bankAccountType: user.bankAccountType || undefined,
        bankDocument: user.bankDocument || '',
      });
    }
  }, [user, reset]);

  const selectedRole = watch('role');

  const onSubmit = async (data: EditUserFormValues) => {
    setIsSubmitting(true);
    try {
      if (!db) throw new Error('Firestore not initialized');
      const userRef = doc(db, 'users', user.uid);

      const updateData: Partial<UserDetails> = {
        displayName: data.displayName,
        role: data.role as UserRole, // Cast because Zod enum includes 'financeiro' which might not be in UserRole yet
        updatedAt: serverTimestamp(),
      };

      if (data.role === 'dj') {
        updateData.dj_percentual = data.dj_percentual;
        updateData.bankName = data.bankName || null;
        updateData.bankAgency = data.bankAgency || null;
        updateData.bankAccount = data.bankAccount || null;
        updateData.bankAccountType = data.bankAccountType || null;
        updateData.bankDocument = data.bankDocument || null;
      } else {
        // Clear DJ specific fields if role is not DJ
        updateData.dj_percentual = null;
        updateData.bankName = null;
        updateData.bankAgency = null;
        updateData.bankAccount = null;
        updateData.bankAccountType = null;
        updateData.bankDocument = null;
      }

      await updateDoc(userRef, updateData);
      toast({ title: 'Usuário Atualizado!', description: `${data.displayName} foi atualizado com sucesso.` });
      onClose(true); // Pass true to indicate an update occurred
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar usuário', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Usuário: {user.displayName || user.email}</DialogTitle>
          <DialogDescription>Modifique os detalhes e permissões do usuário.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="displayName">Nome de Exibição</Label>
            <Input id="displayName" {...register('displayName')} />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

          <div>
            <Label htmlFor="role">Função (Role)</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="partner">Sócio</SelectItem>
                    <SelectItem value="dj">DJ</SelectItem>
                    {/* <SelectItem value="financeiro">Financeiro</SelectItem> */}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
          </div>

          {selectedRole === 'dj' && (
            <>
              <div className="pt-2 border-t mt-4">
                <h3 className="text-md font-semibold mb-2 text-primary">Detalhes do DJ</h3>
                <div>
                  <Label htmlFor="dj_percentual">Percentual do DJ (Ex: 0.7 para 70%)</Label>
                  <Input
                    id="dj_percentual"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    {...register('dj_percentual')}
                  />
                  {errors.dj_percentual && <p className="text-sm text-destructive mt-1">{errors.dj_percentual.message}</p>}
                </div>
              </div>

              <div className="space-y-4 mt-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Dados Bancários do DJ</h4>
                <div>
                  <Label htmlFor="bankName">Nome do Banco</Label>
                  <Input id="bankName" {...register('bankName')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAgency">Agência</Label>
                    <Input id="bankAgency" {...register('bankAgency')} />
                  </div>
                  <div>
                    <Label htmlFor="bankAccount">Conta (com dígito)</Label>
                    <Input id="bankAccount" {...register('bankAccount')} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bankAccountType">Tipo de Conta</Label>
                   <Controller
                    name="bankAccountType"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <SelectTrigger id="bankAccountType">
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="corrente">Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                        </SelectContent>
                        </Select>
                    )}
                    />
                </div>
                <div>
                  <Label htmlFor="bankDocument">CPF ou CNPJ</Label>
                  <Input id="bankDocument" {...register('bankDocument')} />
                </div>
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

