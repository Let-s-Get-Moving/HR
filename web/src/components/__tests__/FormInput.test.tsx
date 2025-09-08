import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FormInput from '../FormInput';
import { mockValidationErrors } from '@/utils/testUtils';

describe('FormInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    render(<FormInput label="Test Label" name="test" />);
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'test');
  });

  it('renders with required indicator', () => {
    render(<FormInput label="Required Field" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    const error = mockValidationErrors[0];
    render(<FormInput label="Test" error={error} />);
    
    expect(screen.getByText(error.message)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text', () => {
    render(<FormInput label="Test" helperText="This is helpful" />);
    
    expect(screen.getByText('This is helpful')).toBeInTheDocument();
  });

  it('handles input changes', () => {
    const handleChange = jest.fn();
    render(<FormInput label="Test" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test value');
  });

  it('handles blur events', () => {
    const handleBlur = jest.fn();
    render(<FormInput label="Test" onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    
    expect(handleBlur).toHaveBeenCalled();
  });

  it('renders with left icon', () => {
    const LeftIcon = () => <span data-testid="left-icon">@</span>;
    render(<FormInput label="Test" leftIcon={<LeftIcon />} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pl-10');
  });

  it('renders with right icon', () => {
    const RightIcon = () => <span data-testid="right-icon">✓</span>;
    render(<FormInput label="Test" rightIcon={<RightIcon />} />);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pr-10');
  });

  it('is disabled when disabled prop is true', () => {
    render(<FormInput label="Test" disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('has correct placeholder', () => {
    render(<FormInput label="Test" placeholder="Enter text" />);
    
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('has correct type attribute', () => {
    render(<FormInput label="Test" type="email" />);
    
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<FormInput ref={ref} label="Test" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies error styles when has error', () => {
    const error = mockValidationErrors[0];
    render(<FormInput label="Test" error={error} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-300');
  });

  it('applies focus styles', () => {
    render(<FormInput label="Test" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('focus:outline-none', 'focus:ring-2');
  });

  it('has correct accessibility attributes', () => {
    const error = mockValidationErrors[0];
    render(
      <FormInput 
        label="Test" 
        error={error} 
        helperText="Helper text"
        name="test-field"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'field-test-field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('renders with custom container className', () => {
    render(<FormInput label="Test" containerClassName="custom-container" />);
    
    expect(screen.getByRole('textbox').closest('.custom-container')).toBeInTheDocument();
  });

  it('renders with custom input className', () => {
    render(<FormInput label="Test" className="custom-input" />);
    
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });
});
