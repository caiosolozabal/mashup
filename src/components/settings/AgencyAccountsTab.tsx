
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { AgencyAccount } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AgencyAccountFormDialog, { type AgencyAccountFormValues } from './AgencyAccountFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AgencyAccountsTab() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AgencyAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AgencyAccount | null>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      if (!db) throw new Error('Firestore not initialized');
      const accountsCollection = collection(db, 'agency_accounts');
      const q = query(accountsCollection, orderBy('accountName'));
      const accountsSnapshot = await getDocs(q);
      const accountsList = accountsSnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as AgencyAccount));
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error fetching agency accounts:', error);
      toast({ variant: 'destructive', title: 'Erro ao buscar contas', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenFormDialog = (account?: AgencyAccount) => {
    setSelectedAccount(account || null);
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = (refetch?: boolean) => {
    setIsFormDialogOpen(false);
    setSelectedAccount(null);
    if (refetch) {
      fetchAccounts();
    }
  };

  const handleOpenDeleteDialog = (account: AgencyAccount) => {
    setSelectedAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (values: AgencyAccountFormValues) => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Firestore não inicializado.'});
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedAccount) {
        const accountRef = doc(db, 'agency_accounts', selectedAccount.id);
        await updateDoc(accountRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Conta Atualizada!', description: `A conta "${values.accountName}" foi atualizada.` });
      } else {
        await addDoc(collection(db, 'agency_accounts'), { ...values, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: 'Conta Adicionada!', description: `A conta "${values.accountName}" foi criada.` });
      }
      handleCloseFormDialog(true);
    } catch (error) {
      console.error('Error saving agency account:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar conta', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount || !db) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'agency_accounts', selectedAccount.id));
      toast({ title: 'Conta Excluída!', description: `A conta "${selectedAccount.accountName}" foi excluída.` });
      setIsDeleteDialogOpen(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting agency account:', error);
      toast({ variant: 'destructive', title: 'Erro ao excluir conta', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando contas da agência...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => handleOpenFormDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-5 w-5" />
          Adicionar Conta
        </Button>
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma conta da agência cadastrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Conta</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Chave PIX</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.accountName}</TableCell>
                  <TableCell>{account.bankName}</TableCell>
                  <TableCell className="capitalize">{account.accountType}</TableCell>
                  <TableCell>{account.pixKey || 'N/A'}</TableCell>
                  <TableCell className="max-w-xs truncate" title={account.notes}>{account.notes || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="icon" aria-label="Editar Conta" onClick={() => handleOpenFormDialog(account)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" aria-label="Excluir Conta" onClick={() => handleOpenDeleteDialog(account)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {isFormDialogOpen && (
        <AgencyAccountFormDialog
          isOpen={isFormDialogOpen}
          onClose={handleCloseFormDialog}
          onSubmit={handleFormSubmit}
          account={selectedAccount}
          isSubmitting={isSubmitting}
        />
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{selectedAccount?.accountName}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAccount(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
