import { useState, useEffect } from 'react';
import {
  Note,
  Loading,
  Row,
  Col,
  Pagination,
  Table,
  Image,
  Collapse,
  Page,
  Text,
  User,
} from '@geist-ui/react';
import Head from 'next/head';
import useSWR from 'swr';
import styles from '../styles/Home.module.css';
import TelegramLoginButton from 'react-telegram-login';
import { DEMO_USER } from './consts';

async function fetchWithToken(url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: localStorage.getItem('telegram-user'),
  });

  return res.json();
}

function Pager({ initialData: data, user }) {
  const [pageIndex, setPageIndex] = useState({});

  console.log(pageIndex);

  let allData = data;

  // useEffect(() => {
  //   const { data: userData, error: userDataError } = useSWR(
  //     `/api/updates?page=${pageIndex}&user=`,
  //     fetchWithToken
  //   );
  // }, [user, pageIndex]);

  const formattedData = (data || []).map((d) => {
    return {
      ...d,
      updates: d.updates
        .filter((u) => {
          return u.message || u.file_path;
        })
        .map((u) => {
          return {
            ...u,
            createdAt: new Date(u.createdAt).toDateString(),
            message: u.message ? <code>{u.message}</code> : '',
            file_path: () => {
              if (!u.file_path) return;
              if (
                ['voice', 'video', 'animation', 'audio', 'video_note'].includes(
                  u.type
                )
              ) {
                return (
                  <video
                    controls={u.type !== 'animation'}
                    autoPlay={u.type === 'animation'}
                    loop
                  >
                    <source src={u.file_path} />
                  </video>
                );
              } else if (u.type === 'photo') {
                return (
                  <Image src={u.file_path} alt='Submission' height={200} />
                );
              }
            },
          };
        }),
    };
  });

  return formattedData.map((u) => {
    return (
      <div key={u.id} style={{ marginBottom: 20 }}>
        <Collapse
          shadow
          title={u.name}
          subtitle={`${u.updates.length} updates posted`}
        >
          <Table data={u.updates}>
            <Table.Column prop='createdAt' label='date' />
            <Table.Column prop='message' label='message' />
            <Table.Column prop='file_path' label='file' />
          </Table>

          <Pagination
            count={u.updates.length}
            initialPage={pageIndex}
            onChange={(i) => setPageIndex((prev) => ({ ...prev, [u.id]: i }))}
          />
        </Collapse>
      </div>
    );
  });
}

export default function Home({ BOT_NAME, ENV }) {
  const [user, setUser] = useState(ENV === 'production' ? {} : DEMO_USER);

  const { data: initialData, error: initialDataError } = useSWR(
    [`/api/updates`],
    fetchWithToken
  );

  const { data: groups, error: groupsError } = useSWR(
    [`/api/groups`],
    fetchWithToken
  );

  useEffect(() => {
    if (user) {
      return;
    }

    const userInfo = localStorage.getItem('telegram-user');

    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
  }, [user]);

  const handleTelegramResponse = (response) => {
    localStorage.setItem('telegram-user', JSON.stringify(response));
    setUser(response);
  };

  return (
    <Page>
      <Head>
        <title>Super Simple Standup Bot</title>
        <meta
          name='description'
          content='Super simple standup bot brings standup functionality to Telegram. Group members are able to submit updates, and they are all sent to a shared channel at a set time.'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <Page.Header>
        <Row gap={0.8} align='middle' justify='space-around'>
          <Col span='auto'>
            <Text h2>Super Simple Standup Bot</Text>
          </Col>
          <Col span='auto'>
            {ENV === 'production' && !user?.photo_url && (
              <TelegramLoginButton
                dataOnauth={handleTelegramResponse}
                botName='stood_bot'
              />
            )}

            {user.photo_url && (
              <User size='medium' src={user.photo_url} name={user.first_name}>
                {groups ? groups.join(', ') : null}
              </User>
            )}
          </Col>
        </Row>
      </Page.Header>

      <Page.Content>
        {user.photo_url ? (
          <div>
            <Text h3>Group updates</Text>

            {user && initialDataError && (
              <Note type='error'>
                Could not load profile. Make sure you message the bot first
              </Note>
            )}

            {user && !initialDataError && !initialData && (
              <Loading>loading...</Loading>
            )}

            <Pager initialData={initialData} user={user} />
          </div>
        ) : (
          <>
            <p className={styles.description}>
              Get started by messaging{' '}
              <a className={styles.code} href={`https://t.me/${BOT_NAME}`}>
                @{BOT_NAME}
              </a>
            </p>
            <div className={styles.grid}>
              <a
                href='https://github.com/RusseII/telegram-standup-bot'
                className={styles.card}
              >
                <h2>Documentation &rarr;</h2>
                <p>
                  Find in-depth information about {BOT_NAME} features and API.
                </p>
              </a>
            </div>
          </>
        )}
      </Page.Content>
    </Page>
  );
}

export async function getStaticProps() {
  return {
    props: { BOT_NAME: process.env.BOT_NAME, ENV: process.env.NODE_ENV },
  };
}
