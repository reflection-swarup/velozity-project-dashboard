import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="py-20 text-center">
    <p className="text-sm font-medium text-slate-900">This page does not exist</p>
    <Link to="/" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
      Back to dashboard
    </Link>
  </div>
);
