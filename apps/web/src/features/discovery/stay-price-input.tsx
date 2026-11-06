import { MAX_STAY_PRICE, isStayInteger } from './stay-search-validation';

function formatPriceInput(digits: string) {
  return digits.replace(/\B(?=(?:\d{3})+(?!\d))/g, '.');
}

export function StayPriceInput({
  value,
  onChange,
  errorId,
  form,
}: {
  value: string;
  onChange: (value: string) => void;
  errorId?: string;
  form?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      form={form}
      aria-invalid={errorId ? true : undefined}
      aria-describedby={errorId}
      value={isStayInteger(value, 0, MAX_STAY_PRICE) ? formatPriceInput(value) : value}
      onChange={(event) => {
        const input = event.currentTarget;
        const text = input.value;
        const digits = text.replace(/\./g, '');
        const inputType = (event.nativeEvent as InputEvent).inputType;
        const invalidPaste =
          inputType === 'insertFromPaste' && text.includes('.') && !/^\d{1,3}(?:\.\d{3})+$/.test(text);
        if (invalidPaste || (digits && !isStayInteger(digits, 0, MAX_STAY_PRICE))) {
          onChange(text);
          return;
        }

        const formatted = formatPriceInput(digits);
        if (text !== formatted) {
          const digitsBeforeCaret = text
            .slice(0, input.selectionStart ?? text.length)
            .replace(/\./g, '').length;
          let caret = 0;
          for (let remaining = digitsBeforeCaret; remaining > 0; caret += 1) {
            if (formatted[caret] !== '.') remaining -= 1;
          }
          if (inputType === 'deleteContentForward' && formatted[caret] === '.') caret += 1;
          input.value = formatted;
          input.setSelectionRange(caret, caret);
        }
        onChange(digits);
      }}
    />
  );
}
