import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { ProgressBar } from '../components/ProgressBar';

function fillWidth() {
  const fill = screen.getByTestId('progress-bar-fill');
  const flatStyle = Array.isArray(fill.props.style)
    ? Object.assign({}, ...fill.props.style)
    : fill.props.style;
  return flatStyle.width;
}

describe('ProgressBar', () => {
  it('renders the given percent as fill width', async () => {
    await renderWithTheme(<ProgressBar percent={42} />);
    expect(fillWidth()).toBe('42%');
  });

  it('clamps values above 100 to 100%', async () => {
    await renderWithTheme(<ProgressBar percent={150} />);
    expect(fillWidth()).toBe('100%');
  });

  it('clamps negative values to 0%', async () => {
    await renderWithTheme(<ProgressBar percent={-20} />);
    expect(fillWidth()).toBe('0%');
  });
});
