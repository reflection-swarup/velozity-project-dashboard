import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="py-20 text-center">
    <p className="text-sm font-medium text-ink">This page does not exist</p>
    <Link to="/dashboard" className="mt-2 inline-block text-sm text-accent hover:underline">
      Back to dashboard
    </Link>
  </div>
);
