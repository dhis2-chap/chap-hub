import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Model verification",
  description:
    "What Verified means on Chap Hub: compatibility checks and their limitations, without a guarantee of model performance.",
};

export default function VerificationPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <h1 className="font-brand text-[clamp(32px,4vw,46px)] font-medium leading-[1.1] text-ink">
        What does Verified mean?
      </h1>
      <div className="mt-6 max-w-[70ch] space-y-8 text-[17px] leading-[1.6] text-ink-2">
        <p>
          Verified means a listed model version has been reviewed for
          compatibility with Chap. Verification applies to the specific code
          revision and published image, not to every version of a model.
        </p>
        <section>
          <h2 className="mb-3 font-brand text-[22px] font-medium text-ink">
            What we check
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              The model is a chapkit 2 service with a published image tied to
              the listed source-code commit.
            </li>
            <li>
              The service registers with Chap and can run training and
              prediction.
            </li>
            <li>
              The registry entry passes validation, including its version
              pins, channels and configuration metadata. The stable channel
              points to a verified version.
            </li>
          </ul>
          <p className="mt-3">
            New models and version pins go through a pull request before
            listing. Versions still in review are not verified.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-brand text-[22px] font-medium text-ink">
            What verification does not mean
          </h2>
          <p>
            <strong className="font-medium text-ink">
              Verified does not assess or guarantee model performance.
            </strong>{" "}
            A successful training and prediction run does not establish
            forecast accuracy, scientific validity or suitability for your
            location, disease or data. Evaluate the model on relevant data
            before using its forecasts to inform decisions.
          </p>
          <p className="mt-3">
            Verification is a limited compatibility review, not exhaustive
            testing or a security audit. Authors remain responsible for
            testing and maintaining their models. Any author assessment shown
            on a model page is the authors&apos; own claim.
          </p>
        </section>
        <p>
          This follows the approach of the{" "}
          <a
            href="https://developers.dhis2.org/docs/guides/apphub-guidelines/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand hover:underline"
          >
            DHIS2 App Hub submission guidelines
          </a>
          : make review expectations clear and leave extensive testing with
          authors. Chap Hub verification is a separate review for model
          compatibility with Chap.
        </p>
        <Link href="/" className="d2-button d2-button-secondary">
          Browse models
        </Link>
      </div>
    </main>
  );
}
