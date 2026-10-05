import { AuthForm } from "./components/auth-form"
import { AuthLayout } from "./components/auth-layout"

export function AuthPage() {
  return (
    <AuthLayout>
      <AuthForm />
    </AuthLayout>
  )
}
