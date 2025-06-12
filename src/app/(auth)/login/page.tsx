import LoginForm from '@/components/auth/LoginForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-center">Welcome Back!</CardTitle>
        <CardDescription className="text-center">
          Sign in to manage your DJ agency.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
