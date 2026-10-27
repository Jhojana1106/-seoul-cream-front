import { Link, useLocation } from "react-router-dom"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BookOpenIcon,
  BoxesIcon,
  ChartColumnIcon,
  CandyIcon,
  ClipboardListIcon,
  FactoryIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  RefrigeratorIcon,
  Settings2Icon,
  ShieldIcon,
  ShoppingBagIcon,
  StoreIcon,
  TagsIcon,
  TicketIcon,
  TruckIcon,
  UsersIcon,
  UtensilsIcon,
  WarehouseIcon,
} from "lucide-react"
import { useAuth } from "@/features/auth"
import { adminNavigation } from "@/lib/access"
import { Mark } from "@/features/store/components"

const icons: Record<string, React.ReactNode> = {
  "/admin": <LayoutDashboardIcon />,
  "/admin/orders": <ClipboardListIcon />,
  "/admin/pos": <StoreIcon />,
  "/admin/products": <UtensilsIcon />,
  "/admin/categories": <TagsIcon />,
  "/admin/toppings": <CandyIcon />,
  "/admin/coupons": <TicketIcon />,
  "/admin/cases": <RefrigeratorIcon />,
  "/admin/inventory": <WarehouseIcon />,
  "/admin/ingredients": <BoxesIcon />,
  "/admin/recipes": <BookOpenIcon />,
  "/admin/production": <FactoryIcon />,
  "/admin/purchases": <ShoppingBagIcon />,
  "/admin/suppliers": <TruckIcon />,
  "/admin/customers": <UsersIcon />,
  "/admin/users": <UsersIcon />,
  "/admin/roles": <ShieldIcon />,
  "/admin/permissions": <KeyRoundIcon />,
  "/admin/reports": <ChartColumnIcon />,
  "/admin/settings": <Settings2Icon />,
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasPermission } = useAuth()
  const { pathname } = useLocation()

  const initials =
    user?.name
      ?.split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SC"

  const groups = adminNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link to="/admin">
                <Mark className="size-5!" />
                <span className="text-base font-semibold">Seoul Cream</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMain
                items={group.items.map((item) => ({
                  title: item.title,
                  url: item.url,
                  icon: icons[item.url],
                }))}
                activePath={pathname}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name || "Usuario",
            email: user?.email || "",
            avatar: user?.avatar_url || "",
            initials,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
