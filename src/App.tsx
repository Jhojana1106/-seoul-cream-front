import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import { AppShell } from "@/components/layout/app-shell"
import {
  AuthProvider,
  LoginPage,
  ProfilePage,
  ProtectedRoute,
} from "@/features/auth"
import { DashboardPage } from "@/features/dashboard"
import { PermissionsPage } from "@/features/permissions"
import { RolesPage } from "@/features/roles"
import { UsersPage } from "@/features/users"
import { CartProvider } from "@/features/store/cart"
import { StoreLayout, HomePage } from "@/features/store/pages/home"
import { CatalogPage, CollectionsPage } from "@/features/store/pages/catalog"
import { ProductPage } from "@/features/store/pages/product"
import { CartPage, CheckoutPage, ConfirmationPage, ContactPage } from "@/features/store/pages/checkout"
import { AccountPage, CustomerOrderPage, CustomerOrdersPage, RegisterPage } from "@/features/store/pages/account"
import { CategoriesAdminPage, ProductsAdminPage, ToppingsAdminPage } from "@/features/admin/pages/catalog-admin"
import { CasesAdminPage, OrdersAdminPage, PosPage } from "@/features/admin/pages/floor"
import {
  CouponsAdminPage,
  CustomersAdminPage,
  IngredientsAdminPage,
  InventoryAdminPage,
  ProductionAdminPage,
  PurchasesAdminPage,
  RecipesAdminPage,
  ReportsAdminPage,
  SettingsAdminPage,
  SuppliersAdminPage,
} from "@/features/admin/pages/backoffice"
import { Allowed } from "@/features/admin/gate"

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <CartProvider>
              <Routes>
                <Route element={<StoreLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="menu" element={<CatalogPage />} />
                  <Route path="menu/:slug" element={<ProductPage />} />
                  <Route path="colecciones" element={<CollectionsPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="pedido/:number/confirmacion" element={<ConfirmationPage />} />
                  <Route path="contacto" element={<ContactPage />} />
                  <Route path="registro" element={<RegisterPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="account" element={<AccountPage />} />
                    <Route path="account/orders" element={<CustomerOrdersPage />} />
                    <Route path="account/orders/:number" element={<CustomerOrderPage />} />
                  </Route>
                </Route>

                <Route path="/login" element={<LoginPage />} />

                <Route path="/admin" element={<ProtectedRoute staff />}>
                  <Route element={<AppShell />}>
                    <Route index element={<Allowed permission="dashboard.view"><DashboardPage /></Allowed>} />
                    <Route path="orders" element={<Allowed permission="orders.view"><OrdersAdminPage /></Allowed>} />
                    <Route path="pos" element={<Allowed permission="pos.access"><PosPage /></Allowed>} />
                    <Route path="products" element={<Allowed permission="products.view"><ProductsAdminPage /></Allowed>} />
                    <Route path="categories" element={<Allowed permission="categories.view"><CategoriesAdminPage /></Allowed>} />
                    <Route path="toppings" element={<Allowed permission="toppings.view"><ToppingsAdminPage /></Allowed>} />
                    <Route path="cases" element={<Allowed permission="display-cases.view"><CasesAdminPage /></Allowed>} />
                    <Route path="inventory" element={<Allowed permission="inventory.view"><InventoryAdminPage /></Allowed>} />
                    <Route path="ingredients" element={<Allowed permission="ingredients.view"><IngredientsAdminPage /></Allowed>} />
                    <Route path="recipes" element={<Allowed permission="recipes.view"><RecipesAdminPage /></Allowed>} />
                    <Route path="production" element={<Allowed permission="production.view"><ProductionAdminPage /></Allowed>} />
                    <Route path="purchases" element={<Allowed permission="purchases.view"><PurchasesAdminPage /></Allowed>} />
                    <Route path="suppliers" element={<Allowed permission="suppliers.view"><SuppliersAdminPage /></Allowed>} />
                    <Route path="customers" element={<Allowed permission="customers.view"><CustomersAdminPage /></Allowed>} />
                    <Route path="reports" element={<Allowed permission="reports.view"><ReportsAdminPage /></Allowed>} />
                    <Route path="coupons" element={<Allowed permission="coupons.view"><CouponsAdminPage /></Allowed>} />
                    <Route path="settings" element={<Allowed permission="settings.view"><SettingsAdminPage /></Allowed>} />
                    <Route path="users" element={<Allowed permission="users.view"><UsersPage /></Allowed>} />
                    <Route path="roles" element={<Allowed permission="roles.view"><RolesPage /></Allowed>} />
                    <Route path="permissions" element={<Allowed permission="permissions.view"><PermissionsPage /></Allowed>} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </CartProvider>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
