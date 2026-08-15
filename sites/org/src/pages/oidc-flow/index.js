import DocusaurusLayout from '@theme/Layout'
import { DocusaurusPage } from '@freesewing/react/components/Docusaurus'
import { BaseLayout, Layout, NoTitleLayout } from '@freesewing/react/components/Layout'
import { WarningIcon, FingerprintIcon, BoolYesIcon } from '@freesewing/react/components/Icon'
import { Popout } from '@freesewing/react/components/Popout'
import { linkClasses, getSearchParam } from '@freesewing/utils'
import { useEffect, useState } from 'react'
import { RoleBlock } from '@freesewing/react/components/Role'
import { MiniTip } from '@freesewing/react/components/Mini'
import Link from '@docusaurus/Link'
import { useAccount } from '@freesewing/react/hooks/useAccount'

// Official OIDC clients
const clients = {
  forum: {
    title: 'FreeSewing Forum',
    href: 'https://forum.freesewing.eu/',
    fqdn: 'forum.freesewing.eu',
  },
  support: {
    title: 'FreeSewing Support Backend',
    href: 'https://support.freesewing.eu/',
    fqdn: 'support.freesewing.eu',
  },
  morio: {
    title: 'FreeSewing Morio Instance',
    href: 'https://morio.freesewing.eu/',
    fqdn: 'morio.freesewing.eu',
  },
  supermorio: {
    title: 'FreeSewing Morio Instance',
    href: 'https://morio.freesewing.eu/',
    fqdn: 'morio.freesewing.eu',
  },
  semaphoreui: {
    title: 'FreeSewing Ansible UI',
    href: 'https://ansible.freesewing.eu/',
    fqdn: 'ansible.freesewing.eu',
  },
  matrix: {
    title: 'FreeSewing Chat',
    href: 'https://matrix.freesewing.eu/',
    fqdn: 'matrix.freesewing.eu',
  },
}

/*
 * This is the OIDC flow sign in page.
 * Each page MUST be wrapped in the DocusaurusPage component.
 * You also MUST pass in the DocusaurusLayout compoment.
 */
export default function SignInPage() {
  const [uid, setUid] = useState('')
  const [client, setClient] = useState('')
  const { token, account } = useAccount()

  useEffect(() => {
    const interaction = getSearchParam('uid')
    const client_id = getSearchParam('client')
    setUid(interaction || false)
    setClient(client_id || false)
  }, [])

  if (uid === false || client === false || !Object.keys(clients).includes(client))
    return <InvalidUrlWarning />
  if (!uid) return <OneMomentPlease />

  // Client data
  const cd = clients[client]

  return (
    <DocusaurusPage
      DocusaurusLayout={DocusaurusLayout}
      Layout={BaseLayout}
      title="Sign in with FreeSewing"
      description="Sign In with your FreeSewing account"
    >
      <div className="tw:text-base-content tw:px-4 tw:max-w-2xl tw:mx-auto tw:py-12">
        <h1 className="tw:break-words tw:hidden">Sign in with FreeSewing</h1>
        <RoleBlock role="user">
          <div className="tw:border tw:rounded-lg tw:max-w-lg">
            <h5
              className={`tw:flex tw:flex-row tw:items-center tw:gap-2 tw:px-4 tw:bg-primary
            tw:rounded-t-lg tw:text-primary-content tw:justify-between`}
            >
              <span className="tw:text-primary-content">Sign in with FreeSewing</span>
              <span className="tw:text-primary-content">
                <FingerprintIcon />
              </span>
            </h5>
            <div className="tw:w-full tw:p-4">
              <h3 className="tw:text-center">
                <span className="tw:font-medium tw:text-xl">The {cd.title}</span>
                <span className="tw:font-medium tw:text-l">
                  (
                  <a href={cd.href} title={cd.fqdn}>
                    {cd.fqdn}
                  </a>
                  )
                </span>
                <br />
                <span className="tw:font-medium tw:text-xl">
                  wants to access your FreeSewing account
                </span>
              </h3>
              <table className="tw:table tw:mx-auto tw:border-0">
                <tbody>
                  {['Avatar', 'Bio', 'Email Address', 'User ID'].map((item) => (
                    <tr key={item} className="tw:bg-transparent tw:border-0">
                      <td className="tw:w-10 tw:border-0 tw:bg-transparent">
                        <BoolYesIcon />
                      </td>
                      <td className="tw:border-0 tw:font-bold">Your {item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <form
                method="POST"
                action={`https://backend.freesewing.eu/interaction/${uid}/login`}
                className="tw:mb-4"
              >
                <input type="hidden" name="token" value={token} />
                <div className="tw:grid tw:grid-cols-2 tw:gap-2 tw:mt-2">
                  <a
                    href={cd.href}
                    className="tw:daisy-btn tw:daisy-btn-primary tw:daisy-btn-outline"
                  >
                    Deny
                  </a>
                  <button type="submit" className="tw:daisy-btn tw:daisy-btn-primary">
                    Allow
                  </button>
                </div>
              </form>
              <MiniTip>
                You should only share your FreeSewing account data with sites you trust. In this
                case, as <b>{cd.title}</b> is an official FreeSewing site, there is no risk.
              </MiniTip>
            </div>
          </div>
        </RoleBlock>
      </div>
    </DocusaurusPage>
  )
}

const InvalidUrlWarning = () => (
  <DocusaurusPage
    DocusaurusLayout={DocusaurusLayout}
    Layout={Layout}
    title="Invalid OIDC Flow ID"
    description="Use your FreeSewing account to sign in to other services or sites"
  >
    <div className="tw:flex tw:flex-col tw:items-center tw:text-base-content tw:px-4">
      <div className="tw:w-full tw:py-4 tw:max-w-lg">
        <h2 className="tw:flex tw:flex-row tw:items-end tw:justify-between tw:gap-2 tw:flex-wrap tw:text-4xl">
          Nope
          <WarningIcon className="tw:w-10 tw:h-10 tw:text-error" />
        </h2>
        <p className="tw:mb-2">
          Attempting to climb aboard the OIDC flow midway is not a good idea.
        </p>
        <details>
          <summary className={linkClasses}>What does that mean?</summary>
          <Popout type="tip" title="Why do I get this error about OIDC flow?">
            <p className="tw:mb-2">
              Your request lacks a valid interaction ID for the OpenID Connect (OIDC) flow. Such an
              interaction ID that is automatically generated by he FreeSewing backend prior to
              redirecting to this page.
            </p>
            <p className="tw:mb-2">
              In other words, this page only works if you were sent here by our backend with the
              proper paperwork.
            </p>
            <p className="tw:mb-2">
              If you are not certain how you ended up here in the first place, just navigate away.
              Try{' '}
              <Link href="/" className={linkClasses}>
                the home page
              </Link>{' '}
              if you are not certain what to do next.
            </p>
          </Popout>
        </details>
      </div>
    </div>
  </DocusaurusPage>
)

const OneMomentPlease = () => (
  <DocusaurusPage
    DocusaurusLayout={DocusaurusLayout}
    Layout={NoTitleLayout}
    title="One moment please"
    description="We are gathering all the required info"
  >
    <div className="tw:flex tw:flex-col tw:items-center tw:text-base-content tw:px-4">
      <div className="tw:max-w-xl tw:w-full tw:py-12">
        <h1>One moment please</h1>
        <p>This should not take long.</p>
      </div>
    </div>
  </DocusaurusPage>
)
