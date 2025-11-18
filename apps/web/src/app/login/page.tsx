'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, loginCustomer, setToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCustomer, setIsCustomer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 FORM SUBMIT ejecutado', { email, password, isCustomer });
    
    setError('');
    setLoading(true);

    try {
      // PASO 1: Test con httpbin para verificar que fetch funciona
      console.log('🔍 Test fetch a httpbin...');
      const testRes = await fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'ok' }),
      });
      console.log('🔍 Resultado httpbin:', testRes.status);
      
      // PASO 2: Si httpbin funciona, intentar con el backend real
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log('🔍 API_URL:', apiUrl);
      
      if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL no está configurada');
      }
      
      console.log('🔍 Intentando login con backend:', `${apiUrl}/auth/login`);
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error login:', response.status, errorData);
        setError(errorData.error || 'Error al iniciar sesión');
        return;
      }
      
      const data = await response.json();
      console.log('✅ Login exitoso:', data);
      
      setToken(data.token);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('❌ Error en login:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-t-lg py-6">
          <CardTitle className="text-3xl font-bold text-white drop-shadow-lg">Constanza</CardTitle>
          <CardDescription className="text-base text-white/90">
            Sistema de Cobranzas B2B
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form 
            className="space-y-4" 
            onSubmit={handleSubmit}
            // IMPORTANTE: que el form envuelva todo el contenido de login
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="customer"
                name="customer"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isCustomer}
                onChange={(e) => setIsCustomer(e.target.checked)}
              />
              <label htmlFor="customer" className="text-sm text-gray-700">
                Soy cliente
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              onClick={() => {
                console.log('🔍 BUTTON CLICK');
              }}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg font-semibold"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
