async function testBlockchains() {
  const tonWallet = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';
  const trxWallet = 'TKuKMQpQVbAfdwzbQm6zxGrfTRdC2ZixVe';

  try {
    const tonRes = await fetch('https://tonapi.io/v2/accounts/' + tonWallet + '/events?limit=10');
    console.log('TonAPI status:', tonRes.status);
    if (tonRes.ok) {
      const data = await tonRes.json();
      console.log('TonAPI events found:', data.events?.length);
      if (data.events?.length > 0) {
        console.log('Latest TonAPI event:', JSON.stringify(data.events[0], null, 2).slice(0, 300));
      }
    }
  } catch (e) {
    console.log('TonAPI error:', e.message);
  }

  try {
    const toncenterRes = await fetch('https://toncenter.com/api/v2/getTransactions?address=' + tonWallet + '&limit=10');
    console.log('Toncenter status:', toncenterRes.status);
    if (toncenterRes.ok) {
      const tcData = await toncenterRes.json();
      console.log('Toncenter txs found:', tcData.result?.length);
    }
  } catch (e) {
    console.log('Toncenter error:', e.message);
  }

  try {
    const tronRes = await fetch('https://api.trongrid.io/v1/accounts/' + trxWallet + '/transactions?limit=10');
    console.log('TronGrid status:', tronRes.status);
    if (tronRes.ok) {
      const data = await tronRes.json();
      console.log('TronGrid txs found:', data.data?.length);
    }
  } catch (e) {
    console.log('TronGrid error:', e.message);
  }
}
testBlockchains();

