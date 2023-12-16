import { render } from '@testing-library/react-native';
import renderer from 'react-test-renderer';
import { App } from '../App';

test('renders correctly', () => {
  renderer.create(<App />);
  const element = render(<App />);
  expect(element).toBeDefined();
});
