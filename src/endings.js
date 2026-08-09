function baseEnding(state, cause) {
  const a = state.attrs;
  if (cause === 'exit-specialty')
    return {
      id: 'another_path',
      title: '另一條路',
      body: '你選擇了另一個專科,過上了另一種生活:有的月份忙,有的月份閒,也有自己這一行的難處。多年後的同學會,外科的同學聊著刀房裡的事,你安靜地聽,像在聽一個平行世界。沒有誰的選擇比較高明——每一條路,都有各自要付的代價。',
    };
  if (cause === 'death')
    return {
      id: 'no_self_heal',
      title: '醫者不能自醫',
      body: `${state.age} 歲,你倒在工作中,再也沒有醒來。訃聞說你「一生奉獻醫療」。追思會上,院方代表致詞三分鐘;你救過的人有些來了,站在最後一排。你教別人保養身體教了一輩子,唯一沒掛你門診的病人,是你自己。`,
    };
  if (state.career === 'aesthetic' && state.talents.social >= 6)
    return {
      id: 'laser',
      title: '你的雷射打得又快又好',
      body: '診所越開越大,你學會了行銷、學會了話術、學會了準時下班。存摺上的數字,終於對得起你當年的聯考分數。只是偶爾在深夜,你的右手還記得打結的觸感——那雙手現在保養得很好,像一件收進櫃子裡的樂器。',
    };
  if (state.career === 'aesthetic')
    return {
      id: 'rent',
      title: '診所的租金又漲了',
      body: '你以為離開健保就是出路。但你不擅長招呼客人,不擅長直播,不擅長把療程包裝成夢想。你的技術在這裡值不了錢——你這才發現,原來在哪裡都一樣:這個世界從來沒有打算為技術本身付錢。',
    };
  if (state.rank === 'professor' && a.clinical < 60)
    return {
      id: 'no_or',
      title: '你已經很久沒進開刀房了',
      body: '教授、部主任、學會理事。你的行程表滿是會議,牆上滿是獎狀。有年輕主治恭敬地問起你當年的刀法,你笑了笑,沒有回答——因為你自己也快想不起來了。你用放下手術刀,換到了讓別人拿起手術刀的位置。值不值得,你沒有問過自己。',
    };
  if (a.clinical >= 85 && a.familyBond < 30)
    return {
      id: 'legend',
      title: '手術室的傳說,家裡的陌生人',
      body: '退休茶會擠滿了人,每個學生都有一個你半夜救場的故事。你是傳說。回到家,你和家人坐在同一張餐桌,客氣得像多年不見的舊識。你能在三小時內完成別人五小時的刀,卻用了三十年,沒能走完從醫院到家裡的那段路。',
    };
  if (a.clinical >= 40 && a.familyBond >= 50 && a.health >= 40 && a.self >= 50)
    return {
      id: 'ordinary',
      title: '平凡的幸福',
      body: '你不是傳說,論文不多,錢也不多。但你的孩子認得你,你的膝蓋還能爬山,你偶爾會收到當年病人的年節簡訊。深夜你偶爾想:如果當年再拼一點……然後你聽見隔壁房間家人的呼吸聲,把這個念頭輕輕關掉。在這個制度裡,「平凡」是你能搶救回來的最好結局——而它竟然需要搶救。',
    };
  return {
    id: 'retire',
    title: '你退休了',
    body: '歡送會的蛋糕上寫著「仁心仁術」。你交還識別證,走出醫院大門,警衛跟你點頭,一如過去三十幾年的每一天。你開過的刀、救回的人、錯過的晚餐——這些數字不會出現在任何獎狀上。它們只出現在下面這張表裡。',
  };
}

export function decideEnding(state, cause) {
  const a = state.attrs;
  const e = baseEnding(state, cause);
  let filterKind = null;
  let filterLine = null;
  if (a.self < 25) {
    filterKind = 'gray';
    filterLine = '但直到最後,你始終不知道,自己為什麼活得這麼累。';
  } else if (a.self >= 70) {
    filterKind = 'peace';
    filterLine = '你知道自己為什麼這樣活。這件事,比任何頭銜都難得。';
  }
  const settlement = [
    { label: '執刀次數', value: state.stats.surgeries },
    { label: '救回的人', value: state.stats.livesSaved },
    { label: '被告次數', value: state.stats.lawsuits },
    { label: '論文歸類計分', value: `${Math.round(a.papers)} 點` },
    { label: '折合論文', value: `約 ${Math.round(a.papers / 40)} 篇` },
    { label: '其中真的有人引用的', value: `${Math.floor((a.papers / 40) * 0.3)} 篇` },
    { label: '錯過的家庭晚餐', value: state.stats.missedDinners },
    { label: '最終存款', value: `${Math.round(a.money)} 萬` },
    { label: '孩子', value: state.family.kids > 0 ? `${state.family.kids} 個` : '無' },
  ];
  return { ...e, filterKind, filterLine, settlement };
}
