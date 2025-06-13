
'use client';

import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { AgencyAccount } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const agencyAccountFormSchema = z.object({
  accountName: z.string().min(1, 'Nome da conta é obrigatório.'),
  bankName: z.string().min(1, 'Nome do banco é obrigatório.'),
  agencyNumber: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountType: z.enum(['corrente', 'poupanca', 'pj', 'pix', 'outra'], { required_error: 'Tipo da conta é obrigatório.'}),
  pixKey: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type AgencyAccountFormValues = z.infer<typeof agencyAccountFormSchema>;

interface AgencyAccountFormDialogProps {
  isOpen: boolean;
  onClose: (refetch?: boolean) => void;
  onSubmit: (values: AgencyAccountFormValues) => Promise<void>;
  account?: AgencyAccount | null;
  isSubmitting?: boolean;
}

export default function AgencyAccountFormDialog({
  isOpen,
  onClose,
  onSubmit,
  account,
  isSubmitting,
}: AgencyAccountFormDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AgencyAccountFormValues>({
    resolver: zodResolver(agencyAccountFormSchema),
    defaultValues: {
      accountName: '',
      bankName: '',
      agencyNumber: '',
      accountNumber: '',
      accountType: undefined,
      pixKey: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (account) {
      reset({
        accountName: account.accountName,
        bankName: account.bankName,
        agencyNumber: account.agencyNumber || '',
        accountNumber: account.accountNumber || '',
        accountType: account.accountType,
        pixKey: account.pixKey || '',
        notes: account.notes || '',
      });
    } else {
      reset({ // Reset to default when creating new
        accountName: '',
        bankName: '',
        agencyNumber: '',
        accountNumber: '',
        accountType: undefined,
        pixKey: '',
        notes: '',
      });
    }
  }, [account, reset, isOpen]); // Added isOpen to reset on reopen for new

  const handleFormSubmit = async (data: AgencyAccountFormValues) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{account ? 'Editar Conta da Agência' : 'Adicionar Nova Conta da Agência'}</DialogTitle>
          <DialogDescription>
            {account ? 'Atualize os detalhes da conta.' : 'Preencha as informações da nova conta.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="accountName">Nome da Conta (Identificação)</Label>
            <Input id="accountName" {...register('accountName')} />
            {errors.accountName && <p className="text-sm text-destructive mt-1">{errors.accountName.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="bankName">Nome do Banco</Label>
            <Input id="bankName" {...register('bankName')} />
            {errors.bankName && <p className="text-sm text-destructive mt-1">{errors.bankName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="agencyNumber">Agência</Label>
              <Input id="agencyNumber" {...register('agencyNumber')} />
              {errors.agencyNumber && <p className="text-sm text-destructive mt-1">{errors.agencyNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="accountNumber">Conta (com dígito)</Label>
              <Input id="accountNumber" {...register('accountNumber')} />
              {errors.accountNumber && <p className="text-sm text-destructive mt-1">{errors.accountNumber.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="accountType">Tipo de Conta</Label>
            <Controller
              name="accountType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="accountType">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="pj">PJ (Pessoa Jurídica)</SelectItem>
                    <SelectItem value="pix">Apenas PIX (sem dados bancários tradicionais)</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accountType && <p className="text-sm text-destructive mt-1">{errors.accountType.message}</p>}
          </div>

          <div>
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input id="pixKey" {...register('pixKey')} />
            {errors.pixKey && <p className="text-sm text-destructive mt-1">{errors.pixKey.message}</p>}
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Ex: Conta preferencial para X, detalhes adicionais..."/>
            {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {account ? 'Salvar Alterações' : 'Adicionar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
