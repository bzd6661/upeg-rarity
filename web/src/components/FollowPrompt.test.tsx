import { render, screen } from "@testing-library/react";
import { FollowPrompt } from "./FollowPrompt";

test("renders nothing when closed", () => {
  const { container } = render(<FollowPrompt open={false} onClose={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

test("renders modal when open", () => {
  render(<FollowPrompt open={true} onClose={() => {}} />);
  expect(screen.getByText("Follow to start searching")).toBeInTheDocument();
  expect(screen.getByText(/Follow @tiger_web3/)).toBeInTheDocument();
  expect(screen.queryByText("Skip")).not.toBeInTheDocument();
});
