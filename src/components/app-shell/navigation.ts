const navigationItems = [
  { href: '/', label: 'Catalogue' },
  { href: '/sessions', label: 'Mes séances' },
] as const;

export function getNavigationItems(pathname: string) {
  return navigationItems.map((item) => ({
    ...item,
    isCurrent:
      item.href === '/'
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
}
