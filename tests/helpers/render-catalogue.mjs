import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { typescriptLoader } from './load-typescript.mjs';
import { item, lookups } from '../fixtures/catalogue-ui.mjs';

export async function renderCatalogue(screen, query = {}) {
  const noSave = async () => ({ ok: false, message: 'Static preview only.' });
  const load = typescriptLoader({
    'next/navigation': { useRouter: () => ({}), usePathname: () => '/dashboard/items', redirect() { throw new Error('Unexpected preview redirect'); }, notFound() { throw new Error('Unexpected preview 404'); } },
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    '@/app/lib/catalogue/access': { CatalogueError: class extends Error {}, requireCatalogueAdmin: async () => 'preview', catalogueEnabled: () => true },
    '@/app/lib/catalogue/queries': {
      getLookups: async () => lookups, getItem: async () => item,
      listItems: async () => ({ total: 1, items: [item], categories: lookups.categories, page: 1, search: '', category: '', status: 'active', sort: 'name' }),
    },
    '@/app/dashboard/items/actions': Object.fromEntries(['saveItem', 'changeItemStatus', 'duplicateItem', 'addPrice', 'publishRecipe', 'saveOption', 'changeOptionStatus', 'addSupplierReference', 'saveLookup', 'changeLookupStatus', 'addRate'].map(name => [name, noSave])),
  });
  const file = screen === 'list' ? 'page.tsx' : screen === 'new' ? 'new/page.tsx' : screen === 'setup' ? 'setup/page.tsx' : '[id]/page.tsx';
  const Page = load(`app/dashboard/items/${file}`).default;
  const Navigation = load('app/componets/dashboard/DashboardNavigation.tsx').DashboardNavigation;
  const content = await Page({ params: Promise.resolve({ id: item.id }), searchParams: Promise.resolve(query) });
  return renderToStaticMarkup(React.createElement('div', { className: 'mx-auto max-w-7xl px-4 pb-12 sm:px-6' },
    React.createElement('div', { className: 'border-b py-5' }, React.createElement('nav', { className: 'flex flex-wrap gap-4 text-sm' }, React.createElement(Navigation))),
    React.createElement('main', { className: 'mt-8' }, content)));
}
