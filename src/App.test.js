import { render, screen } from '@testing-library/react';
import App from './App';

test('shows the login page when signed out', async () => {
  render(<App />);
  expect(await screen.findByText('Robotics Team Dashboard')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
});
