import { useDispatch, useSelector } from 'react-redux';

/**
 * Use throughout the app instead of plain `useDispatch` and `useSelector`
 * so you get proper TypeScript types (if you ever migrate to TS).
 */
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;