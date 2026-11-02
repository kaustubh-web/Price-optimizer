import * as Tabs from '@radix-ui/react-tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { AppHeader } from './components/AppHeader';
import { ProductList } from './components/ProductList';
import { SalesOverview } from './components/SalesOverview';
import { Skeleton } from './components/ui/Skeleton';
import { useDelayedFlag } from './hooks/useDelayedFlag';
import { useTheme } from './hooks/useTheme';
import { getOrders, getProducts, runAnalysis, syncStore } from './lib/api';

// Loaded on demand: it carries the motion and chart code the Overview tab doesn't need.
const ProductDetail = lazy(() => import('./components/ProductDetail').then((m) => ({ default: m.ProductDetail })));

const PRODUCTS_KEY = ['products'];
const ORDERS_KEY = ['orders'];
const TABS = ['overview', 'products'];

function initialTab() {
  const hash = window.location.hash.slice(1);
  return TABS.includes(hash) ? hash : 'overview';
}

function App() {
  const queryClient = useQueryClient();
  const detailRef = useRef(null);
  const { theme, toggle: toggleTheme } = useTheme();
  const [tab, setTab] = useState(initialTab);

  const productsQuery = useQuery({ queryKey: PRODUCTS_KEY, queryFn: getProducts });
  const ordersQuery = useQuery({ queryKey: ORDERS_KEY, queryFn: getOrders });
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const slowStart = useDelayedFlag(productsQuery.isPending || ordersQuery.isPending, 4000);

  const [selectedId, setSelectedId] = useState(null);
  const selected = products.find((p) => p.id === selectedId) ?? products[0] ?? null;

  // Fresh runs carry model details (confidence, demand curve) that aren't persisted,
  // so they're kept here and preferred over the latest saved recommendation.
  const [freshAnalyses, setFreshAnalyses] = useState({});

  const sync = useMutation({
    mutationFn: syncStore,
    onSuccess: (result) => {
      toast.success('Store synced', {
        description: `${result.synced_products} products, ${result.synced_orders} orders, ${result.price_history_recorded} new price changes.`,
      });
      return queryClient.invalidateQueries();
    },
    onError: (error) => toast.error('Sync failed', { description: error.message }),
  });

  const analysis = useMutation({
    mutationFn: runAnalysis,
    onSuccess: (data, productId) => {
      setFreshAnalyses((prev) => ({ ...prev, [productId]: data }));
      return queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
    onError: (error) => toast.error('Analysis failed', { description: error.message }),
  });

  function changeTab(next) {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
  }

  function handleSelect(id) {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function openProduct(id) {
    setSelectedId(id);
    changeTab('products');
    window.scrollTo({ top: 0 });
  }

  const status = productsQuery.isError ? 'offline' : productsQuery.isPending ? 'connecting' : 'online';

  let selectedAnalysis = null;
  if (selected) {
    const fresh = freshAnalyses[selected.id];
    const saved = selected.recommendations?.[0];
    if (fresh && (!saved || fresh.recommendation.id === saved.id)) {
      selectedAnalysis = { recommendation: fresh.recommendation, model: fresh.model };
    } else if (saved) {
      selectedAnalysis = { recommendation: saved, model: null };
    }
  }

  return (
    <Tabs.Root value={tab} onValueChange={changeTab} className="min-h-screen">
      <AppHeader
        status={status}
        onSync={() => sync.mutate()}
        syncing={sync.isPending}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {slowStart && (
          <p className="mb-6 rounded-lg bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-warning">
            Waking up the server. Free-tier hosting sleeps when idle, so the first load can take up to a minute.
          </p>
        )}

        <Tabs.Content value="overview" className="focus-visible:outline-none">
          <SalesOverview
            ordersQuery={ordersQuery}
            products={products}
            onOpenProduct={openProduct}
            onSync={() => sync.mutate()}
            syncing={sync.isPending}
          />
        </Tabs.Content>

        <Tabs.Content value="products" className="focus-visible:outline-none">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-30">
              <ProductList
                products={products}
                status={productsQuery.status}
                error={productsQuery.error}
                selectedId={selected?.id}
                onSelect={handleSelect}
                onRetry={() => productsQuery.refetch()}
                onSync={() => sync.mutate()}
                syncing={sync.isPending}
              />
            </div>

            <section ref={detailRef} aria-label="Product analysis" className="scroll-mt-28">
              {productsQuery.isSuccess && (
                <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
                  <ProductDetail
                    product={selected}
                    analysis={selectedAnalysis}
                    analysing={analysis.isPending && analysis.variables === selected?.id}
                    analysisBusy={analysis.isPending}
                    onRun={() => selected && analysis.mutate(selected.id)}
                  />
                </Suspense>
              )}
            </section>
          </div>
        </Tabs.Content>
      </main>

      <Toaster position="bottom-right" theme={theme} toastOptions={{ className: 'font-sans' }} />
    </Tabs.Root>
  );
}

export default App;
