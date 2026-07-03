module.exports = (output, context) => {
  const values = context?.config?.values || context?.vars?.values;
  if (!values || !Array.isArray(values) || values.length === 0) {
    return {
      pass: false,
      score: 0,
      reason: 'containsAny requires a values array in config or vars',
    };
  }

  const outputLower = output.toLowerCase();
  const found = values.find(value => outputLower.includes(value.toLowerCase()));
  const pass = Boolean(found);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? `Output contains one of the expected values: ${found}`
      : `Output does not contain any of the expected values: ${values.join(', ')}`,
  };
};
