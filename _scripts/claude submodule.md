
⏺ 맞습니다. .claude.git이 SST면 로컬 복사본은 버릴 대상이지 지킬 대상이 아닙니다. 비교는 뺍니다.

  제가 2단계를 "건너뛰지 마세요"라고 강조한 건 과했습니다. 그건 SST 정책이 정해지기 전의 관점이었습니다.

  줄인 절차 (5줄)

  cd <대상 저장소>

  git rm -r --cached .claude                  # 인덱스에서만 제거, 파일은 남음
  git commit -m "chore: untrack .claude before converting it to a submodule"

  mv .claude /tmp/claude_aside                # 경로 비우기
  git submodule add git@github.com:intothedeep/.claude.git .claude

  git commit -m "chore: add .claude as a submodule"
  git push

  .claude가 아직 커밋된 적 없는 저장소라면 앞의 두 줄은 빼고 나머지만 하면 됩니다.

  남는 것 하나

  mv로 치운 것은 git submodule add가 빈 경로를 요구해서입니다. 지운 게 아니라 옮긴 것이라 /tmp/claude_aside에 남아 있고, 확인 뒤
  버리시면 됩니다. (core.md의 rm 금지 때문이기도 합니다.)

  대신 확인할 것

  비교는 빼되, 이건 한 줄로 보고 가는 게 좋습니다.

  git check-ignore -v .claude

  대상 저장소의 .gitignore가 .claude를 무시하고 있으면 서브모듈 추가가 엉킵니다. 아무것도 출력되지 않으면 정상입니다.

  전환 후

  SST가 됐으니 규칙 수정은 항상 .claude 안에서 하고, 바깥에서는 포인터만 올립니다.

  cd .claude && git add -A && git commit -m "rules: ..." && git push
  cd ..      && git add .claude && git commit -m "chore: bump .claude" && git push

  바깥 커밋을 빠뜨리면 다른 기계에서 옛 버전이 따라옵니다. 이게 서브모듈에서 제일 흔한 사고입니다.