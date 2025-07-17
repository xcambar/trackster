import ConnectWithStrava from './ConnectWithStrava';
import {render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('it should allow the user to sign in', () => {
  it('renders a clickable button with the correct text', async () => {
    render(<ConnectWithStrava/>);
    const button = screen.getByRole('link', { name: /connect with strava/i });
    expect(button).toHaveAttribute('href', '/login/strava');
  });
})