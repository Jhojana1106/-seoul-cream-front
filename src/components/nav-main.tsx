"use client"

import { Link } from "react-router-dom"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  activePath,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
  activePath: string
}) {
  return (
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url === "/" || item.url === "/admin"
                ? activePath === item.url
                : activePath === item.url || activePath.startsWith(`${item.url}/`)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                >
                  <Link to={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
  )
}
