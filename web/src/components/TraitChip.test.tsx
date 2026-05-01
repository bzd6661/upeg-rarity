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

test("applies derived styling when derived prop is set", () => {
  const { container } = render(<TraitChip label="has_wings" value={1} derived />);
  const chip = container.querySelector("span");
  expect(chip?.className).toContain("emerald");
});
