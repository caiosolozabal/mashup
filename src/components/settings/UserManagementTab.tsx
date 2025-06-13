
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EditUserDialog from './EditUserDialog'; // We will create this next

export default function UserManagementTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      if (!db) throw new Error('Firestore not initialized');
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, orderBy('displayName')); // Order by name or email
      const usersSnapshot = await getDocs(q);
      const usersList = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      } as UserDetails));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ variant: 'destructive', title: 'Erro ao buscar usuários', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (user: UserDetails) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = (updated?: boolean) => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    if (updated) {
      fetchUsers(); // Refetch users if an update occurred
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando usuários...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Percentual DJ</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role || 'N/A'}</TableCell>
                <TableCell>
                  {user.role === 'dj' ? (user.dj_percentual ? `${(user.dj_percentual * 100).toFixed(0)}%` : 'Não definido') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                    <Edit className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {selectedUser && (
        <EditUserDialog
          user={selectedUser}
          isOpen={isEditDialogOpen}
          onClose={handleDialogClose}
        />
      )}
    </>
  );
}
