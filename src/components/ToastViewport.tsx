import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';

export const ToastViewport = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            layout
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            onClick={() => removeToast(toast.id)}
            className={cn(
              'rounded-xl border px-3 py-2 text-left text-sm shadow-glow backdrop-blur',
              toast.tone === 'error' &&
                'border-red-300/30 bg-red-500/10 text-red-100 dark:text-red-200',
              toast.tone === 'success' &&
                'border-emerald-300/30 bg-emerald-500/10 text-emerald-100 dark:text-emerald-200',
              toast.tone === 'info' &&
                'border-sky-300/30 bg-sky-500/10 text-sky-100 dark:text-sky-200'
            )}
          >
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
};
