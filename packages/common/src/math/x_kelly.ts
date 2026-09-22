export interface KellyParams {
    /**
     * 승리 확률 (0.01 ~ 0.99).
     * 모델의 현재 예측 확률을 그대로 쓸지, 과거 평균 승률을 쓸지 봇 로직에서 결정하여 주입합니다.
     */
    p: number;

    /**
     * 당장 체결 가능한 Kalshi YES Contract 매수 단가 (0.01 ~ 0.99 달러/센트 비율).
     */
    currentMarketPrice: number;

    /**
     * 1계약 당 수수료 (기본값: 0.01).
     */
    feePerContract?: number;

    /**
     * 이번 매매에 사용할 수 있는 가용 자본금(Budget).
     */
    budget: number;

    /**
     * 모델 불확실성을 방어하기 위해 적용할 부분 켈리 비율.
     * 기본값 0.5 (하프 켈리). 보수적으로 하려면 0.25 (쿼터 켈리).
     */
    fractionalMultiplier?: number;
}

export interface KellyResult {
    payoutRatio: number; // 수수료를 감안한 1달러 획득 시의 손익비 (b)
    rawKellyFraction: number; // 순수 수학적 켈리 비중 (f*)
    targetFraction: number; // 부분 켈리 배수가 적용된 최종 투자 비중
    betAmount: number; // 최종 투자 금액 ($)
    contracts: number; // 실제 매수해야 할 계약 수 (버림 처리)
    estimatedFee: number; // 예상 수수료 총합 ($)
    shouldBet: boolean; // 켈리 공식상 우위(Edge)가 있어 매매해야 하는지 여부
}

/**
 * Kalshi 등 결제값이 1달러(100센트)로 고정된 바이너리 옵션 시장의
 * 매수(Limit Buy) 사이즈를 결정하는 엄밀한 켈리 공식 계산기.
 */
export function calculateKellyOption(params: KellyParams): KellyResult {
    const {
        p,
        currentMarketPrice,
        feePerContract = 0.01,
        budget,
        fractionalMultiplier = 0.5,
    } = params;

    // 비정상적인 확률이나 가격 방어 (0 이하, 1 이상 불가)
    if (
        p <= 0 ||
        p >= 1 ||
        currentMarketPrice <= 0 ||
        currentMarketPrice >= 1
    ) {
        return _emptyResult();
    }

    // 총 진입 비용 (Cost)
    const cost = currentMarketPrice + feePerContract;

    // 비용이 이미 1달러(보상금액)와 같거나 크면 무조건 손해이므로 베팅 불가
    if (cost >= 1.0) {
        return _emptyResult();
    }

    // 승리 시 순수익 (Net Profit)
    const netProfit = 1.0 - cost;

    // 배당 비율 (b, Net Fractional Odds)
    const b = netProfit / cost;

    // 0 나누기 방어 (비현실적이지만 방어)
    if (b <= 0) {
        return _emptyResult();
    }

    // 순수 켈리 공식 (f* = p - (1-p)/b)
    const rawKellyFraction = p - (1 - p) / b;

    // 계산된 순수 켈리 비중이 0 이하라면 승률 대비 배당(가성비)이 너무 안 좋은 것이므로 Edge 없음 (베팅 포기)
    if (rawKellyFraction <= 0) {
        return _emptyResult(b);
    }

    // 부분 켈리 적용을 통한 리스크 감소 (Target Fraction)
    const targetFraction = rawKellyFraction * fractionalMultiplier;

    // 배팅할 최종 금액 및 계약 수 산출
    const betAmount = budget * targetFraction;
    const contracts = Math.floor(betAmount / cost); // 소수점 계약은 불가능하므로 내림 처리
    const estimatedFee = contracts * feePerContract;

    return {
        payoutRatio: b,
        rawKellyFraction,
        targetFraction,
        betAmount,
        contracts,
        estimatedFee,
        shouldBet: contracts > 0, // 살 수 있는 계약 수가 1개라도 있으면 true
    };
}

// 엣지가 없거나 에러케이스일 때 반환하는 빈 객체
function _emptyResult(payoutRatio: number = 0): KellyResult {
    return {
        payoutRatio,
        rawKellyFraction: 0,
        targetFraction: 0,
        betAmount: 0,
        contracts: 0,
        estimatedFee: 0,
        shouldBet: false,
    };
}
