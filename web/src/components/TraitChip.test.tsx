import { render, screen } from "@testing-library/react";
import { TraitChip } from "./TraitChip";

test("renders label, value, and frequency percent", () => {
  render(<TraitChip label="color" value="red" frequency={0.05} />);
  expect(screen.getByText("color:")).toBeInTheDocument();
  expect(screen.getByText("red")).toBeInTheDocument();
  expect(screen.getByText("(5.0%)")).toBeInTheDocument();
});

test("omits frequency when not provided", () => {
  render(<TraitChip label="color" value="red" />);
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});
