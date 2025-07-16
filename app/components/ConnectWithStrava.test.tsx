import ConnectWithStrava from './ConnectWithStrava';
import {render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as jest from 'jest-mock';
import '@testing-library/jest-dom'

describe('it should allow the user to sign in', () => {
  const m = jest.fn();
  it('renders a clickable button with the correct text', async () => {
    render(<ConnectWithStrava onClick={m}/>);
    const button = screen.getByRole('button', { name: /connect with strava/i });
    await userEvent.click(button);
    expect(m).toHaveBeenCalledTimes(1);
  });
})