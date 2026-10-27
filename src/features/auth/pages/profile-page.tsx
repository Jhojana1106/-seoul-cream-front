import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/features/auth/auth-context"
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/features/auth/schemas"
import { applyApiErrors } from "@/lib/form-errors"
import { resolveMediaUrl } from "@/lib/media"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export function ProfilePage() {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document_number: "",
    },
    mode: "onTouched",
  })

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
    mode: "onTouched",
  })

  useEffect(() => {
    if (!user) return
    profileForm.reset({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      document_number: user.document_number || "",
    })
    setPreview(null)
  }, [user, profileForm])

  const initials =
    user?.name
      ?.split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "APP"

  const avatarSrc = preview || resolveMediaUrl(user?.avatar_url)
  const rolesLabel =
    user?.roles?.map((role) => role.name).join(", ") || "Sin roles"

  async function onSaveProfile(values: ProfileValues) {
    try {
      await updateProfile({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        document_number: values.document_number || null,
      })
      toast.success("Perfil actualizado")
    } catch (error) {
      const message = applyApiErrors(
        error,
        profileForm.setError,
        "No se pudo actualizar el perfil"
      )
      toast.error(message)
    }
  }

  async function onChangePassword(values: ChangePasswordValues) {
    try {
      await updateProfile(values)
      passwordForm.reset()
      toast.success("Contraseña actualizada")
    } catch (error) {
      const message = applyApiErrors(
        error,
        passwordForm.setError,
        "No se pudo cambiar la contraseña"
      )
      toast.error(message)
    }
  }

  async function onSelectAvatar(file?: File | null) {
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      toast.error("Formatos permitidos: JPG, PNG o WEBP")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar 2 MB")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      await uploadAvatar(file)
      toast.success("Foto de perfil actualizada")
      setPreview(null)
    } catch (error: unknown) {
      setPreview(null)
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "No se pudo subir la foto"
      toast.error(message)
    } finally {
      URL.revokeObjectURL(objectUrl)
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function onRemoveAvatar() {
    setUploading(true)
    try {
      await removeAvatar()
      toast.success("Foto eliminada")
    } catch {
      toast.error("No se pudo eliminar la foto")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <Card className="overflow-hidden self-start">
          <div className="h-20 bg-[#FFF0D9]" />
          <CardContent className="-mt-10 flex flex-col items-center gap-3 pb-5 text-center">
            <div className="relative">
              <Avatar className="size-20 rounded-2xl border-4 border-card shadow-md">
                <AvatarImage
                  src={avatarSrc}
                  alt={user?.name}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-2xl text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                className="absolute -bottom-1 -right-1 size-8 rounded-full shadow-md"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => void onSelectAvatar(e.target.files?.[0])}
              />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold tracking-tight">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {rolesLabel}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-3.5" />
                Cambiar foto
              </Button>
              {user?.avatar_url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  disabled={uploading}
                  onClick={() => void onRemoveAvatar()}
                >
                  <Trash2 className="size-3.5" />
                  Quitar foto
                </Button>
              ) : null}
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              JPG, PNG o WEBP · máx. 2 MB
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Datos personales</CardTitle>
              <CardDescription>
                Información básica de tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  className="space-y-4"
                  onSubmit={profileForm.handleSubmit(onSaveProfile)}
                  noValidate
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="document_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Documento</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={profileForm.formState.isSubmitting}
                    >
                      {profileForm.formState.isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Cambiar contraseña</CardTitle>
              <CardDescription>
                Confirma tu contraseña actual para actualizarla.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  className="space-y-4"
                  onSubmit={passwordForm.handleSubmit(onChangePassword)}
                  noValidate
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField
                      control={passwordForm.control}
                      name="current_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña actual</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="password_confirmation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={passwordForm.formState.isSubmitting}
                    >
                      {passwordForm.formState.isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Actualizar contraseña
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
