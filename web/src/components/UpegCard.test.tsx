import { render, screen } from "@testing-library/react";
import { UpegCard } from "./UpegCard";

const u = {
  id: 42,
  owner: "0xa",
  traits: { color: "red" },
  score: 1.5,
  rank: 7,
  svg: "<svg width='24' height='24'></svg>",
};

test("displays id and rank", () => {
  render(<UpegCard upeg={u} />);
  expect(screen.getByText("#42")).toBeInTheDocument();
  expect(screen.getByText("rank 7")).toBeInTheDocument();
});
