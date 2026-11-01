import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { AppHeader } from './components/AppHeader';
import { CatalogOverview } from './components/CatalogOverview';
import { ProductDetail } from './components/ProductDetail';
import { ProductList } from './components/ProductList';
import { useDelayedFlag } from './hooks/useDelayedFlag';
import { useTheme } from './hooks/useTheme';
import { getProducts, runAnalysis, syncStore } from './lib/api';
import { catalogSummary } from './lib/insights';

const PRODUCTS_KEY = ['products'];

function App() {
  const queryClient = useQueryClient();
  const detailRef = useRef(null);
  const { theme, toggle: toggleTheme } = useTheme();

  const productsQuery = useQuery({ queryKey: PRODUCTS_KEY, queryFn: getProducts });
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const slowStart = useDelayedFlag(productsQuery.isPending, 4000);

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
      return queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
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

  const summary = useMemo(() => catalogSummary(products), [products]);

  function handleSelect(id) {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    <div className="min-h-screen">
      <AppHeader
        status={status}
        onSync={() => sync.mutate()}
        syncing={sync.isPending}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <CatalogOverview summary={summary} loading={productsQuery.isPending} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-20">
            <ProductList
              products={products}
              status={productsQuery.status}
              error={productsQuery.error}
              slowStart={slowStart}
              selectedId={selected?.id}
              onSelect={handleSelect}
              onRetry={() => productsQuery.refetch()}
              onSync={() => sync.mutate()}
              syncing={sync.isPending}
            />
          </div>

          <section ref={detailRef} aria-label="Product analysis" className="scroll-mt-20">
            {productsQuery.isSuccess && (
              <ProductDetail
                product={selected}
                analysis={selectedAnalysis}
                analysing={analysis.isPending && analysis.variables === selected?.id}
                analysisBusy={analysis.isPending}
                onRun={() => selected && analysis.mutate(selected.id)}
              />
            )}
          </section>
        </div>
      </main>

      <Toaster position="bottom-right" theme={theme} toastOptions={{ className: 'font-sans' }} />
    </div>
  );
}

export default App;
